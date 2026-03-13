The following is the result of a Nuxt typecheck in apps/console project.

$ npx nuxt typecheck

app/components/app/DeployCommitModal.vue:40:28 - error TS2307: Cannot find module '@vueuse/core' or its corresponding type declarations.

40 import { useTimeAgo } from '@vueuse/core';
                              ~~~~~~~~~~~~~~

app/components/app/DeployLatestModal.vue:38:28 - error TS2307: Cannot find module '@vueuse/core' or its corresponding type declarations.

38 import { useTimeAgo } from '@vueuse/core';
                              ~~~~~~~~~~~~~~

app/components/app/ServiceConfigStatic.vue:12:11 - error TS2322: Type 'string | number | undefined' is not assignable to type 'string | undefined'.
  Type 'number' is not assignable to type 'string'.

12           v-model="configuration.buildProps.runtime_version"
             ~~~~~~~

  ../../node_modules/.bun/@nuxt+ui@4.2.0+e5d53343c6ef9188/node_modules/@nuxt/ui/dist/runtime/components/Select.d.vue.ts:94:5
    94     modelValue?: GetModelValue<T, VK, M>;
           ~~~~~~~~~~
    The expected type comes from property 'modelValue' which is declared here on type '{ id?: string | undefined; placeholder?: string | undefined; color?: "primary" | "success" | "error" | "secondary" | "info" | "warning" | "neutral" | undefined; variant?: "outline" | ... 4 more ... | undefined; ... 41 more ...; "onUpdate:modelValue"?: ((value: string) => any) | undefined; } & VNodeProps & AllowedCom...'

app/components/new/EnvironmentVariables.vue:53:3 - error TS2322: Type '{ key: string; value?: string | undefined; }' is not assignable to type '{ key: string; value: string; }'.
  Types of property 'value' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.

53   updated[index] = { ...updated[index], key: newKey };
     ~~~~~~~~~~~~~~

app/components/new/EnvironmentVariables.vue:59:3 - error TS2322: Type '{ value: string; key?: string | undefined; }' is not assignable to type '{ key: string; value: string; }'.
  Types of property 'key' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.

59   updated[index] = { ...updated[index], value: newValue };
     ~~~~~~~~~~~~~~

app/components/new/ServiceConfigStatic.vue:12:11 - error TS2322: Type 'string | number | undefined' is not assignable to type 'string | undefined'.
  Type 'number' is not assignable to type 'string'.

12           v-model="configuration.buildProps.runtime_version"
             ~~~~~~~

  ../../node_modules/.bun/@nuxt+ui@4.2.0+e5d53343c6ef9188/node_modules/@nuxt/ui/dist/runtime/components/Select.d.vue.ts:94:5
    94     modelValue?: GetModelValue<T, VK, M>;
           ~~~~~~~~~~
    The expected type comes from property 'modelValue' which is declared here on type '{ id?: string | undefined; placeholder?: string | undefined; color?: "primary" | "success" | "error" | "secondary" | "info" | "warning" | "neutral" | undefined; variant?: "outline" | ... 4 more ... | undefined; ... 41 more ...; "onUpdate:modelValue"?: ((value: string) => any) | undefined; } & VNodeProps & AllowedCom...'

app/components/org/ProviderCreateStackModal.vue:56:30 - error TS2307: Cannot find module '@vueuse/core' or its corresponding type declarations.

56 import { useClipboard } from '@vueuse/core'
                                ~~~~~~~~~~~~~~

app/composables/useNewApplicationFlow.ts:185:7 - error TS2322: Type '{ access_key_id: string | null; account_id: string | null; alias: string | null; created_at: string; deleted_at: string | null; id: string; organization_id: string; region: string | null; ... 4 more ...; updated_at: string | null; }[]' is not assignable to type '{ id: string; created_at: Date; updated_at: Date | null; organization_id: string; deleted_at: Date | null; secret_id: string | null; region: string | null; alias: string | null; ... 4 more ...; access_key_id: string | null; }[] | { ...; }[]'.
  Type '{ access_key_id: string | null; account_id: string | null; alias: string | null; created_at: string; deleted_at: string | null; id: string; organization_id: string; region: string | null; ... 4 more ...; updated_at: string | null; }[]' is not assignable to type '{ id: string; created_at: Date; updated_at: Date | null; organization_id: string; deleted_at: Date | null; secret_id: string | null; region: string | null; alias: string | null; ... 4 more ...; access_key_id: string | null; }[]'.
    Type '{ access_key_id: string | null; account_id: string | null; alias: string | null; created_at: string; deleted_at: string | null; id: string; organization_id: string; region: string | null; ... 4 more ...; updated_at: string | null; }' is not assignable to type '{ id: string; created_at: Date; updated_at: Date | null; organization_id: string; deleted_at: Date | null; secret_id: string | null; region: string | null; alias: string | null; ... 4 more ...; access_key_id: string | null; }'.
      Types of property 'created_at' are incompatible.
        Type 'string' is not assignable to type 'Date'.

185       providers.value = supabaseProviders || [];
          ~~~~~~~~~~~~~~~

app/composables/useNewApplicationFlow.ts:272:16 - error TS2339: Property 'functionProps' does not exist on type '{ headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | ... 1 more ... | undefined; include?: string[] | undefined; exclude?: string[] | undefined; }; ... 6 more .....'.
  Property 'functionProps' does not exist on type '{ headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | number | undefined; include?: string[] | undefined; exclude?: string[] | undefined; }; ... 6 more ...; denyQ...'.

272       metadata.functionProps = {
                   ~~~~~~~~~~~~~

app/composables/useNewApplicationFlow.ts:273:21 - error TS2339: Property 'functionProps' does not exist on type '{ headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | ... 1 more ... | undefined; include?: string[] | undefined; exclude?: string[] | undefined; }; ... 6 more .....'.
  Property 'functionProps' does not exist on type '{ headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | number | undefined; include?: string[] | undefined; exclude?: string[] | undefined; }; ... 6 more ...; denyQ...'.

273         ...metadata.functionProps,
                        ~~~~~~~~~~~~~

app/composables/useNewApplicationFlow.ts:277:27 - error TS2339: Property 'buildSystem' does not exist on type '{ runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | number | undefined; include?: string[] | undefined; exclude?: string[] | undefined; } | { runtime: string; ... 4 more ...; exclude?: string[] | undefined; } | { ...; }'.
  Property 'buildSystem' does not exist on type '{ runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | number | undefined; include?: string[] | undefined; exclude?: string[] | undefined; }'.

277       metadata.buildProps.buildSystem = 'Custom Dockerfile';
                              ~~~~~~~~~~~

app/composables/useNewApplicationFlow.ts:282:5 - error TS2322: Type '{ stack_type: "STATIC" | "LAMBDA" | "FARGATE"; stack_version: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { ...; }; ... 6 more ...; denyQueryParams: string[]; } | { ...; } | { ...; }; ... 6 more ...; service_variables:...' is not assignable to type '{ name: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | ... 1 more ... | undefined; include?: string[] | undefined; exclude?: string[] | u...'.
  Type '{ stack_type: "STATIC" | "LAMBDA" | "FARGATE"; stack_version: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { ...; }; ... 6 more ...; denyQueryParams: string[]; } | { ...; } | { ...; }; ... 6 more ...; service_variables:...' is not assignable to type '{ name: string; metadata: { debug: boolean; rootDir: string; buildProps: { buildSystem: "Nixpacks" | "Custom Dockerfile"; runtime_version?: string | number | undefined; installcmd?: string | undefined; buildcmd?: string | undefined; startcmd?: string | undefined; include?: string[] | undefined; exclude?: string[] | ...'.
    Types of property 'metadata' are incompatible.
      Type '{ headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | ... 1 more ... | undefined; include?: string[] | undefined; exclude?: string[] | undefined; }; ... 6 more .....' is not assignable to type '{ debug: boolean; rootDir: string; buildProps: { buildSystem: "Nixpacks" | "Custom Dockerfile"; runtime_version?: string | number | undefined; installcmd?: string | undefined; buildcmd?: string | undefined; startcmd?: string | undefined; include?: string[] | undefined; exclude?: string[] | undefined; }; serviceProps...'.
        Property 'serviceProps' is missing in type '{ headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | number | undefined; include?: string[] | undefined; exclude?: string[] | undefined; }; ... 6 more ...; denyQ...' but required in type '{ debug: boolean; rootDir: string; buildProps: { buildSystem: "Nixpacks" | "Custom Dockerfile"; runtime_version?: string | number | undefined; installcmd?: string | undefined; buildcmd?: string | undefined; startcmd?: string | undefined; include?: string[] | undefined; exclude?: string[] | undefined; }; serviceProps...'.

282     return {
        ~~~~~~

  server/validators/common.ts:191:3
    191   serviceProps: FargateServicePropsSchema,
          ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    'serviceProps' is declared here.

app/composables/usePolar.ts:19:25 - error TS2352: Conversion of type '{ active: boolean; created_at: string; description: string | null; id: string; metadata: Json; name: string; updated_at: string | null; }[]' to type 'Product[]' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  Type '{ active: boolean; created_at: string; description: string | null; id: string; metadata: Json; name: string; updated_at: string | null; }' is not comparable to type 'Product'.
    Type '{ active: boolean; created_at: string; description: string | null; id: string; metadata: Json; name: string; updated_at: string | null; }' is not comparable to type 'Omit<{ id: string; active: boolean; name: string; description: string | null; metadata: unknown; created_at: Date; updated_at: Date | null; }, "metadata">'.
      Types of property 'created_at' are incompatible.
        Type 'string' is not comparable to type 'Date'.

19       products.value = (data as Product[]).sort((a, b) => {
                           ~~~~~~~~~~~~~~~~~

app/composables/useSaveAndRebuild.ts:58:11 - error TS2322: Type '() => Promise<string | null>' is not assignable to type '((event: MouseEvent) => void | Promise<void>) | ((event: MouseEvent) => void | Promise<void>)[] | undefined'.
  Type '() => Promise<string | null>' is not assignable to type '(event: MouseEvent) => void | Promise<void>'.
    Type 'Promise<string | null>' is not assignable to type 'void | Promise<void>'.
      Type 'Promise<string | null>' is not assignable to type 'Promise<void>'.
        Type 'string | null' is not assignable to type 'void'.
          Type 'null' is not assignable to type 'void'.

58           onClick: () => triggerBuild()
             ~~~~~~~

  ../../node_modules/.bun/@nuxt+ui@4.2.0+e5d53343c6ef9188/node_modules/@nuxt/ui/dist/runtime/components/Button.d.vue.ts:29:5
    29     onClick?: ((event: MouseEvent) => void | Promise<void>) | Array<((event: MouseEvent) => void | Promise<void>)>;
           ~~~~~~~
    The expected type comes from property 'onClick' which is declared here on type 'ButtonProps'

app/layouts/app.vue:256:7 - error TS2719: Type '{ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | ... 1 more ... | undefined; include?: string[] | undefined; exclude?: ...' is not assignable to type '{ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | ... 1 more ... | undefined; include?: string[] | undefined; exclude?: ...'. Two different types with this name exist, but they are unrelated.
  Type 'null' is not assignable to type '{ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | ... 1 more ... | undefined; include?: string[] | undefined; exclude?: ...'.

256       service: service.value,
          ~~~~~~~

app/layouts/app.vue:257:7 - error TS2719: Type '{ id: string; name: string; display_name: string; region: string; services: ({ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; ... 8 more ...; denyQueryParams: string[]; }; ... 11 more ...; service_secrets?: { ...; }[] | undefined; } |...' is not assignable to type '{ id: string; name: string; display_name: string; region: string; services: ({ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; ... 8 more ...; denyQueryParams: string[]; }; ... 11 more ...; service_secrets?: { ...; }[] | undefined; } |...'. Two different types with this name exist, but they are unrelated.
  Type 'null' is not assignable to type '{ id: string; name: string; display_name: string; region: string; services: ({ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; ... 8 more ...; denyQueryParams: string[]; }; ... 11 more ...; service_secrets?: { ...; }[] | undefined; } |...'.

257       environment: environment.value
          ~~~~~~~~~~~

app/layouts/app.vue:270:7 - error TS2719: Type '{ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | ... 1 more ... | undefined; include?: string[] | undefined; exclude?: ...' is not assignable to type '{ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | ... 1 more ... | undefined; include?: string[] | undefined; exclude?: ...'. Two different types with this name exist, but they are unrelated.
  Type 'null' is not assignable to type '{ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; outputDir: string; buildProps: { runtime: string; installcmd: string; buildcmd: string; runtime_version?: string | ... 1 more ... | undefined; include?: string[] | undefined; exclude?: ...'.

270       service: service.value,
          ~~~~~~~

app/layouts/app.vue:271:7 - error TS2719: Type '{ id: string; name: string; display_name: string; region: string; services: ({ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; ... 8 more ...; denyQueryParams: string[]; }; ... 11 more ...; service_secrets?: { ...; }[] | undefined; } |...' is not assignable to type '{ id: string; name: string; display_name: string; region: string; services: ({ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; ... 8 more ...; denyQueryParams: string[]; }; ... 11 more ...; service_secrets?: { ...; }[] | undefined; } |...'. Two different types with this name exist, but they are unrelated.
  Type 'null' is not assignable to type '{ id: string; name: string; display_name: string; region: string; services: ({ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; debug: boolean; rootDir: string; ... 8 more ...; denyQueryParams: string[]; }; ... 11 more ...; service_secrets?: { ...; }[] | undefined; } |...'.

271       environment: environment.value
          ~~~~~~~~~~~

app/layouts/app.vue:282:19 - error TS18048: 'provider.value' is possibly 'undefined'.

282       providerId: provider.value.id,
                      ~~~~~~~~~~~~~~

app/layouts/app.vue:283:18 - error TS18047: 'service.value' is possibly 'null'.

283       serviceId: service.value.id,
                     ~~~~~~~~~~~~~

app/pages/app/[app_id]/builds/[build_id].vue:282:16 - error TS2362: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.

282   const diff = end - start.getTime();
                   ~~~

app/pages/app/[app_id]/deploys/[deploy_id].vue:209:9 - error TS7053: Element implicitly has an 'any' type because expression of type '"deep-link"' can't be used to index type 'string | number | boolean | { [key: string]: Json | undefined; } | Json[]'.
  Property 'deep-link' does not exist on type 'string | number | boolean | { [key: string]: Json | undefined; } | Json[]'.

209     if (newDeploy.pipeline_log?.['deep-link']) {
            ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app/pages/app/[app_id]/deploys/[deploy_id].vue:210:24 - error TS7053: Element implicitly has an 'any' type because expression of type '"deep-link"' can't be used to index type 'string | number | boolean | { [key: string]: Json | undefined; } | Json[]'.
  Property 'deep-link' does not exist on type 'string | number | boolean | { [key: string]: Json | undefined; } | Json[]'.

210       deepLink.value = newDeploy.pipeline_log['deep-link'];
                           ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app/pages/app/[app_id]/deploys/[deploy_id].vue:338:16 - error TS2362: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.

338   const diff = end - start.getTime();
                   ~~~

app/pages/app/[app_id]/index.vue:213:28 - error TS2307: Cannot find module '@vueuse/core' or its corresponding type declarations.

213 import { useTimeAgo } from '@vueuse/core';
                               ~~~~~~~~~~~~~~

app/pages/app/[app_id]/settings.vue:331:7 - error TS2719: Type '{ id: string; name: string; organization_id: string; environments: { id: string; name: string; display_name: string; region: string; services: ({ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; ... 10 more ...; denyQueryParams: string[]; }; ... 11 more ...; service_se...' is not assignable to type '{ id: string; name: string; organization_id: string; environments: { id: string; name: string; display_name: string; region: string; services: ({ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; ... 10 more ...; denyQueryParams: string[]; }; ... 11 more ...; service_se...'. Two different types with this name exist, but they are unrelated.
  Type 'null' is not assignable to type '{ id: string; name: string; organization_id: string; environments: { id: string; name: string; display_name: string; region: string; services: ({ id: string; name: string; metadata: { headers: { value: string; name: string; path: string; }[]; ... 10 more ...; denyQueryParams: string[]; }; ... 11 more ...; service_se...'.

331       application: applicationSchema.value,
          ~~~~~~~~~~~

app/pages/app/[app_id]/variables.vue:16:49 - error TS2322: Type '{ value?: string | undefined; id?: string | undefined; created_at?: Date | undefined; updated_at?: Date | null | undefined; deleted_at?: Date | null | undefined; type?: "build" | ... 1 more ... | undefined; service_id?: string | undefined; key?: string | undefined; }[]' is not assignable to type '({ value: string; key: string; } | undefined)[]'.
  Type '{ value?: string | undefined; id?: string | undefined; created_at?: Date | undefined; updated_at?: Date | null | undefined; deleted_at?: Date | null | undefined; type?: "build" | ... 1 more ... | undefined; service_id?: string | undefined; key?: string | undefined; }' is not assignable to type '{ value: string; key: string; }'.
    Types of property 'value' are incompatible.
      Type 'string | undefined' is not assignable to type 'string'.
        Type 'undefined' is not assignable to type 'string'.

16       <UForm ref="form" :schema="envVarSchema" :state="formState.variables" class="space-y-4"  :validate-on="['blur']">
                                                   ~~~~~

  ../../node_modules/.bun/@nuxt+ui@4.2.0+e5d53343c6ef9188/node_modules/@nuxt/ui/dist/runtime/components/Form.d.vue.ts:8:5
    8     state?: N extends false ? Partial<InferInput<S>> : never;
          ~~~~~
    The expected type comes from property 'state' which is declared here on type '{ id?: string | number | undefined; schema?: ZodEffects<ZodArray<ZodObject<{ key: ZodString; value: ZodString; }, "strip", ZodTypeAny, { value: string; key: string; }, { value: string; key: string; }>, "many">, { ...; }[], { ...; }[]> | undefined; ... 18 more ...; onError?: ((event: FormErrorEvent) => any) | undefin...'

app/pages/app/[app_id]/variables.vue:105:5 - error TS2322: Type '{ created_at: string; deleted_at: string | null; id: string; key: string; service_id: string; type: "build" | "runtime"; updated_at: string | null; value: string; }[]' is not assignable to type '{ value?: string | undefined; id?: string | undefined; created_at?: Date | undefined; updated_at?: Date | null | undefined; deleted_at?: Date | null | undefined; type?: "build" | ... 1 more ... | undefined; service_id?: string | undefined; key?: string | undefined; }[]'.
  Type '{ created_at: string; deleted_at: string | null; id: string; key: string; service_id: string; type: "build" | "runtime"; updated_at: string | null; value: string; }' is not assignable to type '{ value?: string | undefined; id?: string | undefined; created_at?: Date | undefined; updated_at?: Date | null | undefined; deleted_at?: Date | null | undefined; type?: "build" | ... 1 more ... | undefined; service_id?: string | undefined; key?: string | undefined; }'.
    Types of property 'created_at' are incompatible.
      Type 'string' is not assignable to type 'Date'.

105     formState.value.variables = data || [];
        ~~~~~~~~~~~~~~~~~~~~~~~~~

app/pages/app/[app_id]/variables.vue:184:60 - error TS2345: Argument of type '{ id: string; service_id: string; type: string; value?: string | undefined; created_at?: Date | undefined; updated_at?: Date | null | undefined; deleted_at?: Date | null | undefined; key?: string | undefined; }' is not assignable to parameter of type '{ value: string; id: string; type: "build" | "runtime"; key: string; service_id?: string | undefined; }'.
  Types of property 'value' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.

184       return $client.services.updateServiceVariable.mutate({ ...mutationInput, id });
                                                               ~~~~~~~~~~~~~~~~~~~~~~~~

app/pages/app/[app_id]/variables.vue:186:60 - error TS2345: Argument of type '{ service_id: string; type: string; value?: string | undefined; created_at?: Date | undefined; updated_at?: Date | null | undefined; deleted_at?: Date | null | undefined; key?: string | undefined; }' is not assignable to parameter of type '{ value: string; type: "build" | "runtime"; service_id: string; key: string; }'.
  Types of property 'value' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
      Type 'undefined' is not assignable to type 'string'.

186       return $client.services.createServiceVariable.mutate(mutationInput);
                                                               ~~~~~~~~~~~~~

app/pages/new/configure.vue:61:20 - error TS2322: Type '{ value: string; label: string | null; }[]' is not assignable to type 'ArrayOrNested<SelectItem> | undefined'.
  Type '{ value: string; label: string | null; }[]' is not assignable to type 'SelectItem[]'.
    Type '{ value: string; label: string | null; }' is not assignable to type 'SelectItem'.
      Type '{ value: string; label: string | null; }' is not assignable to type '{ [key: string]: any; label?: string | undefined; description?: string | undefined; icon?: string | object | undefined; avatar?: AvatarProps | undefined; chip?: ChipProps | undefined; ... 5 more ...; ui?: Pick<...> | undefined; }'.
        Types of property 'label' are incompatible.
          Type 'string | null' is not assignable to type 'string | undefined'.
            Type 'null' is not assignable to type 'string | undefined'.

61                   :items="providerItems"
                      ~~~~~

  ../../node_modules/.bun/@nuxt+ui@4.2.0+e5d53343c6ef9188/node_modules/@nuxt/ui/dist/runtime/components/Select.d.vue.ts:90:5
    90     items?: T;
           ~~~~~
    The expected type comes from property 'items' which is declared here on type '{ id?: string | undefined; placeholder?: string | undefined; color?: "primary" | "success" | "error" | "secondary" | "info" | "warning" | "neutral" | undefined; variant?: "outline" | ... 4 more ... | undefined; ... 41 more ...; "onUpdate:modelValue"?: ((value: AcceptableValue | undefined) => any) | undefined; } & VN...'

app/pages/new/configure.vue:68:28 - error TS2532: Object is possibly 'undefined'.

68                   v-model="applicationSchema.environments[0].region"
                              ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

app/pages/new/configure.vue:80:14 - error TS2322: Type 'string | null' is not assignable to type 'string | undefined'.
  Type 'null' is not assignable to type 'string | undefined'.

80             :scan-error="scanError"
                ~~~~~~~~~~


app/pages/org/[org_id]/aws.vue:87:40 - error TS2345: Argument of type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; } | { ...; } | undefined' is not assignable to parameter of type 'Product | ProductMetadata | undefined'.
  Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product | ProductMetadata | undefined'.
    Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product'.
      Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type '{ metadata: ProductMetadata; }'.
        Types of property 'metadata' are incompatible.
          Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
            Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
              Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'RecurringProductMetadata | BaseProductMetadata'.
                Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'BaseProductMetadata'.
                  Types of property 'medias' are incompatible.
                    The type 'readonly any[]' is 'readonly' and cannot be assigned to the mutable type 'any[]'.

87 const isFree = computed(() => isFreeFn(currentPlan.value));
                                          ~~~~~~~~~~~~~~~~~

app/pages/org/[org_id]/aws.vue:156:40 - error TS2345: Argument of type 'string | ConcreteComponent<{}, any, any, ComputedOptions, MethodOptions, {}, any>' is not assignable to parameter of type 'Component'.
  Type 'string' is not assignable to type 'Component'.

156           const modal = overlay.create(providerEditModal, {
                                           ~~~~~~~~~~~~~~~~~

app/pages/org/[org_id]/aws.vue:187:40 - error TS2345: Argument of type 'string | ConcreteComponent<{}, any, any, ComputedOptions, MethodOptions, {}, any>' is not assignable to parameter of type 'Component'.
  Type 'string' is not assignable to type 'Component'.

187           const modal = overlay.create(providerDeleteModal, {
                                           ~~~~~~~~~~~~~~~~~~~

app/pages/org/[org_id]/aws.vue:206:14 - error TS7031: Binding element 'row' implicitly has an 'any' type.

206     cell: ({ row }) => {
                 ~~~

app/pages/org/[org_id]/aws.vue:215:14 - error TS7031: Binding element 'row' implicitly has an 'any' type.

215     cell: ({ row }) => {
                 ~~~

app/pages/org/[org_id]/aws.vue:227:14 - error TS7031: Binding element 'row' implicitly has an 'any' type.

227     cell: ({ row }) => {
                 ~~~

app/pages/org/[org_id]/aws.vue:240:14 - error TS7031: Binding element 'row' implicitly has an 'any' type.

240     cell: ({ row }) => h('div', { class: 'text-right' }, [
                 ~~~

app/pages/org/[org_id]/aws.vue:263:5 - error TS2322: Type '{ access_key_id: string | null; account_id: string | null; alias: string | null; created_at: string; deleted_at: string | null; id: string; organization_id: string; region: string | null; ... 4 more ...; updated_at: string | null; }[]' is not assignable to type '{ id: string; created_at: Date; updated_at: Date | null; organization_id: string; deleted_at: Date | null; secret_id: string | null; region: string | null; alias: string | null; ... 4 more ...; access_key_id: string | null; }[] | { ...; }[]'.
  Type '{ access_key_id: string | null; account_id: string | null; alias: string | null; created_at: string; deleted_at: string | null; id: string; organization_id: string; region: string | null; ... 4 more ...; updated_at: string | null; }[]' is not assignable to type '{ id: string; created_at: Date; updated_at: Date | null; organization_id: string; deleted_at: Date | null; secret_id: string | null; region: string | null; alias: string | null; ... 4 more ...; access_key_id: string | null; }[]'.
    Type '{ access_key_id: string | null; account_id: string | null; alias: string | null; created_at: string; deleted_at: string | null; id: string; organization_id: string; region: string | null; ... 4 more ...; updated_at: string | null; }' is not assignable to type '{ id: string; created_at: Date; updated_at: Date | null; organization_id: string; deleted_at: Date | null; secret_id: string | null; region: string | null; alias: string | null; ... 4 more ...; access_key_id: string | null; }'.
      Types of property 'created_at' are incompatible.
        Type 'string' is not assignable to type 'Date'.

263     providers.value = data
        ~~~~~~~~~~~~~~~

app/pages/org/[org_id]/billing.vue:99:12 - error TS2322: Type 'readonly { readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }[]' is not assignable to type 'readonly Product[]'.
  Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product'.
    Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type '{ metadata: ProductMetadata; }'.
      Types of property 'metadata' are incompatible.
        Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
          Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
            Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'RecurringProductMetadata | BaseProductMetadata'.
              Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'BaseProductMetadata'.
                Types of property 'medias' are incompatible.
                  The type 'readonly any[]' is 'readonly' and cannot be assigned to the mutable type 'any[]'.

99           :plans="products"
              ~~~~~


app/pages/org/[org_id]/billing.vue:163:40 - error TS2345: Argument of type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; } | undefined' is not assignable to parameter of type 'Product | ProductMetadata | undefined'.
  Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product | ProductMetadata | undefined'.
    Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product'.
      Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type '{ metadata: ProductMetadata; }'.
        Types of property 'metadata' are incompatible.
          Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
            Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
              Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'RecurringProductMetadata | BaseProductMetadata'.
                Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'BaseProductMetadata'.
                  Types of property 'medias' are incompatible.
                    The type 'readonly any[]' is 'readonly' and cannot be assigned to the mutable type 'any[]'.

163 const isFree = computed(() => isFreeFn(currentPlan));
                                           ~~~~~~~~~~~

app/pages/org/[org_id]/billing.vue:178:33 - error TS2345: Argument of type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to parameter of type 'Product | ProductMetadata | undefined'.
  Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product'.
    Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type '{ metadata: ProductMetadata; }'.
      Types of property 'metadata' are incompatible.
        Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
          Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
            Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'RecurringProductMetadata | BaseProductMetadata'.
              Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'BaseProductMetadata'.
                Types of property 'medias' are incompatible.
                  The type 'readonly any[]' is 'readonly' and cannot be assigned to the mutable type 'any[]'.

178   const targetIsFree = isFreeFn(targetPlan);
                                    ~~~~~~~~~~

app/pages/org/[org_id]/billing.vue:205:5 - error TS2322: Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product | { id: string; active: boolean; name: string; description: string | null; created_at: Date; updated_at: Date | null; metadata: { is_recurring: true; recurring_interval: "month" | "year"; ... 14 more ...; recurring_interval_count: number | null; } | { ...; } | { ...; }; } | null'.
  Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type '{ id: string; active: boolean; name: string; description: string | null; created_at: Date; updated_at: Date | null; metadata: { is_recurring: true; recurring_interval: "month" | "year"; ... 14 more ...; recurring_interval_count: number | null; } | { ...; } | { ...; }; }'.
    Types of property 'metadata' are incompatible.
      Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type '{ is_recurring: true; recurring_interval: "month" | "year"; id: string; name: string; medias: any[]; benefits: any[]; prices: ({ amount_type: "fixed"; price_amount: number; price_currency: string; ... 7 more ...; recurring_interval: "month" | ... 1 more ... | null; } | { ...; } | { ...; } | { ...; })[]; ... 9 more ....'.
        Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type '{ is_recurring: true; recurring_interval: "month" | "year"; id: string; name: string; medias: any[]; benefits: any[]; prices: ({ amount_type: "fixed"; price_amount: number; price_currency: string; ... 7 more ...; recurring_interval: "month" | ... 1 more ... | null; } | { ...; } | { ...; } | { ...; })[]; ... 9 more ....'.
          Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type '{ is_recurring: true; recurring_interval: "month" | "year"; id: string; name: string; medias: any[]; benefits: any[]; prices: ({ amount_type: "fixed"; price_amount: number; price_currency: string; ... 7 more ...; recurring_interval: "month" | ... 1 more ... | null; } | { ...; } | { ...; } | { ...; })[]; ... 9 more ....'.
            Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type '{ id: string; name: string; medias: any[]; benefits: any[]; prices: ({ amount_type: "fixed"; price_amount: number; price_currency: string; id: string; type: "recurring" | "one_time"; source?: string | undefined; ... 4 more ...; recurring_interval: "month" | ... 1 more ... | null; } | { ...; } | { ...; } | { ...; })[...'.
              Types of property 'medias' are incompatible.
                The type 'readonly any[]' is 'readonly' and cannot be assigned to the mutable type 'any[]'.

205     pendingDowngradePlan.value = selected;
        ~~~~~~~~~~~~~~~~~~~~~~~~~~

app/pages/org/[org_id]/billing.vue:210:35 - error TS2345: Argument of type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to parameter of type 'Product | ProductMetadata | undefined'.
  Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product'.
    Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type '{ metadata: ProductMetadata; }'.
      Types of property 'metadata' are incompatible.
        Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
          Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
            Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'RecurringProductMetadata | BaseProductMetadata'.
              Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'BaseProductMetadata'.
                Types of property 'medias' are incompatible.
                  The type 'readonly any[]' is 'readonly' and cannot be assigned to the mutable type 'any[]'.

210   const selectedIsFree = isFreeFn(selected);
                                      ~~~~~~~~

app/pages/org/[org_id]/billing.vue:241:23 - error TS2345: Argument of type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to parameter of type 'Product | ProductMetadata | undefined'.
  Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product'.
    Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type '{ metadata: ProductMetadata; }'.
      Types of property 'metadata' are incompatible.
        Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
          Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
            Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'RecurringProductMetadata | BaseProductMetadata'.
              Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'BaseProductMetadata'.
                Types of property 'medias' are incompatible.
                  The type 'readonly any[]' is 'readonly' and cannot be assigned to the mutable type 'any[]'.

241       if (isSeatBased(selected)) {
                          ~~~~~~~~

app/pages/org/[org_id]/index.vue:64:14 - error TS7031: Binding element 'row' implicitly has an 'any' type.

64     cell: ({ row }) => {
                ~~~

app/pages/org/[org_id]/index.vue:76:16 - error TS7031: Binding element 'column' implicitly has an 'any' type.

76     header: ({ column }) => {
                  ~~~~~~

app/pages/org/[org_id]/index.vue:92:14 - error TS7031: Binding element 'row' implicitly has an 'any' type.

92     cell: ({ row }) => h(resolveComponent('NuxtLink'), {
                ~~~

app/pages/org/[org_id]/index.vue:100:14 - error TS7031: Binding element 'row' implicitly has an 'any' type.

100     cell: ({ row }) => {
                 ~~~

app/pages/org/[org_id]/index.vue:113:16 - error TS7031: Binding element 'column' implicitly has an 'any' type.

113     header: ({ column }) => {
                   ~~~~~~

app/pages/org/[org_id]/index.vue:133:16 - error TS7031: Binding element 'column' implicitly has an 'any' type.

133     header: ({ column }) => {
                   ~~~~~~

app/pages/org/[org_id]/index.vue:151:14 - error TS7031: Binding element 'row' implicitly has an 'any' type.

151     cell: ({ row }) => {
                 ~~~

app/pages/org/[org_id]/index.vue:181:24 - error TS7006: Parameter 'state' implicitly has an 'any' type.

181 const saveSortState = (state) => {
                           ~~~~~

app/pages/org/[org_id]/members.vue:82:40 - error TS2345: Argument of type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; } | { ...; } | undefined' is not assignable to parameter of type 'Product | ProductMetadata | undefined'.
  Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product | ProductMetadata | undefined'.
    Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product'.
      Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type '{ metadata: ProductMetadata; }'.
        Types of property 'metadata' are incompatible.
          Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
            Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
              Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'RecurringProductMetadata | BaseProductMetadata'.
                Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'BaseProductMetadata'.
                  Types of property 'medias' are incompatible.
                    The type 'readonly any[]' is 'readonly' and cannot be assigned to the mutable type 'any[]'.

82 const isFree = computed(() => isFreeFn(currentPlan.value));
                                          ~~~~~~~~~~~~~~~~~

app/pages/org/[org_id]/members.vue:83:45 - error TS2345: Argument of type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; } | { ...; } | undefined' is not assignable to parameter of type 'Product | ProductMetadata | undefined'.
  Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product | ProductMetadata | undefined'.
    Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product'.
      Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type '{ metadata: ProductMetadata; }'.
        Types of property 'metadata' are incompatible.
          Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
            Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
              Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'RecurringProductMetadata | BaseProductMetadata'.
                Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'BaseProductMetadata'.
                  Types of property 'medias' are incompatible.
                    The type 'readonly any[]' is 'readonly' and cannot be assigned to the mutable type 'any[]'.

83 const isLifetime = computed(() => isOneTime(currentPlan.value));
                                               ~~~~~~~~~~~~~~~~~

app/pages/org/[org_id]/members.vue:84:48 - error TS2345: Argument of type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; } | { ...; } | undefined' is not assignable to parameter of type '{ id: string; metadata: unknown; user_id: string; organization_id: string; polar_customer_id: string; status: "active" | "trialing" | "canceled" | "incomplete" | "incomplete_expired" | "past_due" | "unpaid" | "paused"; ... 7 more ...; canceled_at: Date | null; } | null | undefined'.
  Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is missing the following properties from type '{ id: string; metadata: unknown; user_id: string; organization_id: string; polar_customer_id: string; status: "active" | "trialing" | "canceled" | "incomplete" | "incomplete_expired" | "past_due" | "unpaid" | "paused"; ... 7 more ...; canceled_at: Date | null; }': user_id, organization_id, polar_customer_id, status, and 8 more.

84 const isTrialing = computed(() => isTrialingFn(currentPlan.value));
                                                  ~~~~~~~~~~~~~~~~~

app/pages/org/[org_id]/members.vue:94:14 - error TS7031: Binding element 'row' implicitly has an 'any' type.

94     cell: ({ row }) => {
                ~~~

app/pages/org/[org_id]/members.vue:118:14 - error TS7031: Binding element 'row' implicitly has an 'any' type.

118     cell: ({ row }) => h('div', { class: 'text-right' }, [
                 ~~~

app/pages/org/[org_id]/settings.vue:94:35 - error TS2304: Cannot find name 'SubscriptionWithMetadata'.

94 const subscription = computed((): SubscriptionWithMetadata | null => {
                                     ~~~~~~~~~~~~~~~~~~~~~~~~

app/pages/org/[org_id]/settings.vue:96:99 - error TS2304: Cannot find name 'SubscriptionWithMetadata'.

96   return org?.subscriptions?.find(sub => sub.status === 'active' || sub.status === 'trialing') as SubscriptionWithMetadata || null;
                                                                                                     ~~~~~~~~~~~~~~~~~~~~~~~~

app/pages/org/[org_id]/settings.vue:98:28 - error TS2304: Cannot find name 'OrderWithMetadata'.

98 const order = computed((): OrderWithMetadata | null => {
                              ~~~~~~~~~~~~~~~~~

app/pages/org/[org_id]/settings.vue:100:30 - error TS2304: Cannot find name 'OrderWithMetadata'.

100   return org?.orders?.[0] as OrderWithMetadata || null;
                                 ~~~~~~~~~~~~~~~~~

app/pages/org/[org_id]/settings.vue:107:22 - error TS2345: Argument of type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; } | undefined' is not assignable to parameter of type 'Product | ProductMetadata | undefined'.
  Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product | ProductMetadata | undefined'.
    Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product'.
      Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type '{ metadata: ProductMetadata; }'.
        Types of property 'metadata' are incompatible.
          Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
            Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
              Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'RecurringProductMetadata | BaseProductMetadata'.
                Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'BaseProductMetadata'.
                  Types of property 'medias' are incompatible.
                    The type 'readonly any[]' is 'readonly' and cannot be assigned to the mutable type 'any[]'.

107            !isFreeFn(currentPlan)
                         ~~~~~~~~~~~

app/pages/org/[org_id]/settings.vue:160:29 - error TS18047: 'count' is possibly 'null'.

160     hasApplications.value = count > 0;
                                ~~~~~

app/pages/org/new.vue:17:29 - error TS2322: Type 'readonly { readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }[]' is not assignable to type 'readonly Product[]'.
  Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product'.
    Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type '{ metadata: ProductMetadata; }'.
      Types of property 'metadata' are incompatible.
        Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
          Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
            Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'RecurringProductMetadata | BaseProductMetadata'.
              Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'BaseProductMetadata'.
                Types of property 'medias' are incompatible.
                  The type 'readonly any[]' is 'readonly' and cannot be assigned to the mutable type 'any[]'.

17       <PricingTable v-else :plans="products" :selectedPlan="selectedPlan" @update:selectedPlan="selectedPlan = $event" />
                               ~~~~~


app/pages/org/new.vue:51:52 - error TS2345: Argument of type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to parameter of type 'Product | ProductMetadata | undefined'.
  Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product'.
    Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type '{ metadata: ProductMetadata; }'.
      Types of property 'metadata' are incompatible.
        Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
          Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
            Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'RecurringProductMetadata | BaseProductMetadata'.
              Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'BaseProductMetadata'.
                Types of property 'medias' are incompatible.
                  The type 'readonly any[]' is 'readonly' and cannot be assigned to the mutable type 'any[]'.

51   const freePlan = products.value.find(p => isFree(p));
                                                      ~

app/pages/org/new.vue:65:29 - error TS2345: Argument of type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; } | undefined' is not assignable to parameter of type 'Product | ProductMetadata | undefined'.
  Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product | ProductMetadata | undefined'.
    Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type 'Product'.
      Type '{ readonly id: string; readonly active: boolean; readonly name: string; readonly description: string | null; readonly created_at: Date; readonly updated_at: Date | null; readonly metadata: { ...; } | ... 1 more ... | { ...; }; }' is not assignable to type '{ metadata: ProductMetadata; }'.
        Types of property 'metadata' are incompatible.
          Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
            Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'ProductMetadata'.
              Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'RecurringProductMetadata | BaseProductMetadata'.
                Type '{ readonly is_recurring: true; readonly recurring_interval: "month" | "year"; readonly id: string; readonly name: string; readonly medias: readonly any[]; readonly benefits: readonly any[]; readonly prices: readonly ({ readonly amount_type: "fixed"; ... 9 more ...; readonly recurring_interval: "month" | ... 1 more ....' is not assignable to type 'BaseProductMetadata'.
                  Types of property 'medias' are incompatible.
                    The type 'readonly any[]' is 'readonly' and cannot be assigned to the mutable type 'any[]'.

65   const isFreePlan = isFree(selected);
                               ~~~~~~~~

app/pages/profile.vue:131:14 - error TS7031: Binding element 'row' implicitly has an 'any' type.

131     cell: ({ row }) => {
                 ~~~

app/pages/profile.vue:142:14 - error TS7031: Binding element 'row' implicitly has an 'any' type.

142     cell: ({ row }) => {
                 ~~~

app/pages/profile.vue:154:14 - error TS7031: Binding element 'row' implicitly has an 'any' type.

154     cell: ({ row }) => h('div', { class: 'text-right' }, [
                 ~~~

server/lib/platform.library.ts:1:41 - error TS1484: 'MessageAttributeValue' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.

1 import { SQSClient, SendMessageCommand, MessageAttributeValue } from '@aws-sdk/client-sqs';
                                          ~~~~~~~~~~~~~~~~~~~~~

server/lib/platform.library.ts:9:10 - error TS1484: 'ServiceSchema' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.

9 import { ServiceSchema } from '../validators/app';
           ~~~~~~~~~~~~~

server/lib/platform.library.ts:320:34 - error TS2532: Object is possibly 'undefined'.

320     const accessTokenSecretArn = userAccessTokens[0].resource;
                                     ~~~~~~~~~~~~~~~~~~~

server/lib/platform.library.ts:345:17 - error TS18048: 'newDestroy' is possibly 'undefined'.

345       eventId = newDestroy.id;
                    ~~~~~~~~~~

server/lib/platform.library.ts:370:17 - error TS18048: 'newBuild' is possibly 'undefined'.

370       eventId = newBuild.id;
                    ~~~~~~~~

server/lib/provider.library.ts:346:43 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.

346             if (cnames && cnames.includes(expectedCname)) return { verified: true, method: 'CNAME', records: cnames };
                                              ~~~~~~~~~~~~~

server/trpc/routers/applications.router.ts:45:25 - error TS18048: 'env' is possibly 'undefined'.

45         const service = env.services[0];
                           ~~~

server/trpc/routers/applications.router.ts:47:14 - error TS18048: 'env' is possibly 'undefined'.

47         if (!env.provider) {
                ~~~

server/trpc/routers/applications.router.ts:52:17 - error TS18048: 'env' is possibly 'undefined'.

52           name: env.name,
                   ~~~

server/trpc/routers/applications.router.ts:53:25 - error TS18048: 'env' is possibly 'undefined'.

53           display_name: env.display_name,
                           ~~~

server/trpc/routers/applications.router.ts:55:24 - error TS18048: 'env' is possibly 'undefined'.

55           provider_id: env.provider.id,
                          ~~~

server/trpc/routers/applications.router.ts:56:19 - error TS18048: 'env' is possibly 'undefined'.

56           region: env.region,
                     ~~~

server/trpc/routers/applications.router.ts:59:31 - error TS18048: 'env' is possibly 'undefined'.

59         const vaultSecretId = env.user_access_token?.secret_id;
                                 ~~~

server/trpc/routers/applications.router.ts:70:62 - error TS18048: 'newEnvironment' is possibly 'undefined'.

70         const secretName = `thunder/${newApplication.name}/${newEnvironment.name}/github-token`;
                                                                ~~~~~~~~~~~~~~

server/trpc/routers/applications.router.ts:72:16 - error TS18048: 'env' is possibly 'undefined'.

72           { ...env.provider, organization_id: input.organization_id },
                  ~~~

server/trpc/routers/applications.router.ts:75:63 - error TS18048: 'newEnvironment' is possibly 'undefined'.

75           `GitHub UAT for app ${newApplication.name} in env ${newEnvironment.name}`,
                                                                 ~~~~~~~~~~~~~~

server/trpc/routers/applications.router.ts:76:11 - error TS18048: 'env' is possibly 'undefined'.

76           env.region
             ~~~

server/trpc/routers/applications.router.ts:82:19 - error TS18048: 'newEnvironment' is possibly 'undefined'.

82           env_id: newEnvironment.id
                     ~~~~~~~~~~~~~~

server/trpc/routers/applications.router.ts:86:34 - error TS18048: 'newEnvironment' is possibly 'undefined'.

86           .set({ environment_id: newEnvironment.id, resource: accessTokenSecretArn })
                                    ~~~~~~~~~~~~~~

server/trpc/routers/applications.router.ts:90:17 - error TS18048: 'service' is possibly 'undefined'.

90           name: service.name,
                   ~~~~~~~

server/trpc/routers/applications.router.ts:91:25 - error TS18048: 'service' is possibly 'undefined'.

91           display_name: service.display_name,
                           ~~~~~~~

server/trpc/routers/applications.router.ts:92:23 - error TS18048: 'service' is possibly 'undefined'.

92           stack_type: service.stack_type,
                         ~~~~~~~

server/trpc/routers/applications.router.ts:93:26 - error TS18048: 'service' is possibly 'undefined'.

93           stack_version: service.stack_version,
                            ~~~~~~~

server/trpc/routers/applications.router.ts:94:28 - error TS18048: 'service' is possibly 'undefined'.

94           installation_id: service.installation_id,
                              ~~~~~~~

server/trpc/routers/applications.router.ts:95:27 - error TS18048: 'newEnvironment' is possibly 'undefined'.

95           environment_id: newEnvironment.id,
                             ~~~~~~~~~~~~~~

server/trpc/routers/applications.router.ts:96:18 - error TS18048: 'service' is possibly 'undefined'.

96           owner: service.owner,
                    ~~~~~~~

server/trpc/routers/applications.router.ts:97:17 - error TS18048: 'service' is possibly 'undefined'.

97           repo: service.repo,
                   ~~~~~~~

server/trpc/routers/applications.router.ts:98:19 - error TS18048: 'service' is possibly 'undefined'.

98           branch: service.branch,
                     ~~~~~~~

server/trpc/routers/applications.router.ts:99:21 - error TS18048: 'service' is possibly 'undefined'.

99           metadata: service.metadata,
                       ~~~~~~~

server/trpc/routers/applications.router.ts:102:13 - error TS18048: 'service' is possibly 'undefined'.

102         if (service.service_variables && service.service_variables.length > 0) {
                ~~~~~~~

server/trpc/routers/applications.router.ts:102:42 - error TS18048: 'service' is possibly 'undefined'.

102         if (service.service_variables && service.service_variables.length > 0) {
                                             ~~~~~~~

server/trpc/routers/applications.router.ts:104:13 - error TS18048: 'service' is possibly 'undefined'.

104             service.service_variables.map(v => ({
                ~~~~~~~

server/trpc/routers/applications.router.ts:108:27 - error TS18048: 'newService' is possibly 'undefined'.

108               service_id: newService.id,
                              ~~~~~~~~~~

server/trpc/routers/applications.router.ts:115:23 - error TS18048: 'newService' is possibly 'undefined'.

115           service_id: newService.id,
                          ~~~~~~~~~~

server/trpc/routers/applications.router.ts:116:23 - error TS18048: 'service' is possibly 'undefined'.

116           stack_type: service.stack_type
                          ~~~~~~~

server/trpc/routers/applications.router.ts:119:69 - error TS18048: 'newService' is possibly 'undefined'.

119         return { newApplicationId: newApplication.id, newServiceId: newService.id };
                                                                        ~~~~~~~~~~

server/trpc/routers/organizations.router.ts:77:13 - error TS2322: Type '{ user_id: string; organization_id: string; polar_customer_id: string; } | undefined' is not assignable to type '{ user_id: string; organization_id: string; polar_customer_id: string; }'.
  Type 'undefined' is not assignable to type '{ user_id: string; organization_id: string; polar_customer_id: string; }'.

77             customer = newCustomerRecord
               ~~~~~~~~

server/trpc/routers/team.router.ts:4:68 - error TS1484: 'ProductMetadata' is a type and must be imported using a type-only import when 'verbatimModuleSyntax' is enabled.

4 import { memberships, users, organizations, subscriptions, orders, ProductMetadata } from '../../db/schema'
                                                                     ~~~~~~~~~~~~~~~

server/lib/provider.library.ts:346:43 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.

346             if (cnames && cnames.includes(expectedCname)) return { verified: true, method: 'CNAME', records: cnames };
                                              ~~~~~~~~~~~~~


Found 111 errors.


 ERROR  Process exited with non-zero status (2)                                                                                                                                    8:37:48 PM

    at G._waitForOutput (/home/sa/www/thunder/platform/node_modules/.deno/tinyexec@1.0.2/node_modules/tinyexec/dist/main.js:574:92)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Object.run (/home/sa/www/thunder/platform/node_modules/.deno/@nuxt+cli@3.30.0/node_modules/@nuxt/cli/dist/typecheck-egvrxpjV.mjs:66:3)
    at async runCommand (/home/sa/www/thunder/platform/node_modules/.deno/citty@0.1.6/node_modules/citty/dist/index.mjs:316:16)
    at async runCommand (/home/sa/www/thunder/platform/node_modules/.deno/citty@0.1.6/node_modules/citty/dist/index.mjs:307:11)
    at async runMain (/home/sa/www/thunder/platform/node_modules/.deno/citty@0.1.6/node_modules/citty/dist/index.mjs:445:7)



 ERROR  Process exited with non-zero status (2)